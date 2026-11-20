// The Python that runs a generated script's unittest file and reports the
// result as JSON. Shared by the in-browser runner (Pyodide, in a Web Worker)
// and the unit tests (local python3), so both run exactly the same harness.
// It expects SKILL_DIR and NAME to be defined before it runs.
export const HARNESS_PY = `
import io, json, os, sys, traceback, unittest

def _run_tests(skill_dir, name):
    scripts = os.path.join(skill_dir, "scripts")
    os.chdir(scripts)
    sys.path[:] = [scripts] + [p for p in sys.path if not p.startswith("/plugin-run") and p != scripts]
    for module in (name, "test_" + name):
        sys.modules.pop(module, None)
    out = io.StringIO()
    try:
        suite = unittest.defaultTestLoader.loadTestsFromName("test_" + name)
        result = unittest.TextTestRunner(stream=out, verbosity=2).run(suite)
        problems = len(result.failures) + len(result.errors)
        return {"passed": result.wasSuccessful() and result.testsRun > 0, "testsRun": result.testsRun, "problems": problems, "output": out.getvalue()[-8000:]}
    except BaseException:
        return {"passed": False, "testsRun": 0, "problems": 1, "output": (out.getvalue() + traceback.format_exc())[-8000:]}

json.dumps(_run_tests(SKILL_DIR, NAME))
`;

// Runs one script of an uploaded package as its own test command (for
// example check_fixtures.py), from the package's folder, and reports its exit
// code and output. Modules from an earlier run are dropped first. It expects
// ROOT, PATH and ARGV to be defined before it runs.
export const RUN_SCRIPT_PY = `
import contextlib, io, json, os, runpy, subprocess, sys, traceback

# The browser's Python can't start processes, and test runners often call
# their own scripts with subprocess.run([sys.executable, script, ...]). Run
# those in-process instead and hand back the same CompletedProcess; anything
# else (node, shell commands) is reported as unavailable, as on a machine
# without it.
def _in_process_run(cmd, *args, capture_output=False, text=False, input=None, cwd=None, check=False, **kwargs):
    argv = list(cmd) if isinstance(cmd, (list, tuple)) else [cmd]
    if len(argv) < 2 or argv[0] != sys.executable:
        raise FileNotFoundError(argv[0] if argv else "")
    out, err = io.StringIO(), io.StringIO()
    old_argv, old_path, old_cwd, old_stdin = sys.argv, list(sys.path), os.getcwd(), sys.stdin
    code = 0
    try:
        if cwd:
            os.chdir(cwd)
        sys.argv = argv[1:]
        sys.path.insert(0, os.path.dirname(os.path.abspath(argv[1])))
        if input is not None:
            sys.stdin = io.StringIO(input if isinstance(input, str) else input.decode())
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            try:
                runpy.run_path(argv[1], run_name="__main__")
            except SystemExit as stop:
                code = stop.code if isinstance(stop.code, int) else (0 if stop.code is None else 1)
            except BaseException:
                traceback.print_exc()
                code = 1
    finally:
        sys.argv, sys.path, sys.stdin = old_argv, old_path, old_stdin
        os.chdir(old_cwd)
    stdout, stderr = out.getvalue(), err.getvalue()
    if not (text or kwargs.get("universal_newlines") or kwargs.get("encoding")):
        stdout, stderr = stdout.encode(), stderr.encode()
    result = subprocess.CompletedProcess(argv, code, stdout if capture_output or kwargs.get("stdout") else None, stderr if capture_output or kwargs.get("stderr") else None)
    if check and code:
        raise subprocess.CalledProcessError(code, argv, result.stdout, result.stderr)
    return result

subprocess.run = _in_process_run
# No programs to find here but Python itself, so a test that looks for one
# (node, for example) takes its own "not installed" path.
import shutil
shutil.which = lambda name, *args, **kwargs: sys.executable if os.path.basename(str(name)).startswith("python") else None

def _run_script(root, path, argv):
    full = os.path.join(root, path)
    for module in [name for name, value in list(sys.modules.items()) if str(getattr(value, "__file__", "") or "").startswith("/plugin-run")]:
        sys.modules.pop(module, None)
    os.chdir(os.path.dirname(full))
    sys.path[:] = [os.path.dirname(full)] + [p for p in sys.path if not p.startswith("/plugin-run")]
    sys.argv = [full] + list(argv)
    out = io.StringIO()
    code = 0
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            runpy.run_path(full, run_name="__main__")
        except SystemExit as stop:
            code = stop.code if isinstance(stop.code, int) else (0 if stop.code is None else 1)
        except BaseException:
            traceback.print_exc()
            code = 1
    return {"exitCode": code, "output": out.getvalue()[-8000:]}

json.dumps(_run_script(ROOT, PATH, ARGV.to_py() if hasattr(ARGV, "to_py") else ARGV))
`;

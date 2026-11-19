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

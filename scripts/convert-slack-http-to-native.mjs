import { applyNativeNodeParity } from './apply-native-node-parity.mjs';

const result = applyNativeNodeParity();

console.log(
  JSON.stringify(
    {
      converted: result.convertedSlackNodes,
      credentialBindings: result.credentialBindings,
      updatedFiles: result.updatedFiles,
    },
    null,
    2,
  ),
);

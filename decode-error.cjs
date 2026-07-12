const { ethers } = require('ethers');

// Paste the FULL "data" hex string from your error output here, in quotes:
const errorData = 'PASTE_FULL_DATA_HEX_HERE';

const iface = new ethers.Interface(['error NotAllowed(bytes32 handle, address account)']);
try {
  const decoded = iface.parseError(errorData);
  console.log('Decoded:', decoded.name, decoded.args);
} catch (err) {
  console.log('Could not decode:', err.message);
}

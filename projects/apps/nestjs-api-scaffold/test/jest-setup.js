// Node.js v16 polyfill for globalThis.crypto (required by @nestjs/typeorm)
const { webcrypto } = require('crypto');
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

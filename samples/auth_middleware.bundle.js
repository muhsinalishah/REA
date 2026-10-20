
(function(modules) {
  var installedModules = {};
  function __webpack_require__(moduleId) {
    if (installedModules[moduleId]) return installedModules[moduleId].exports;
    var module = installedModules[moduleId] = { i: moduleId, l: false, exports: {} };
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    module.l = true;
    return module.exports;
  }
  return __webpack_require__(__webpack_require__.s = 0);
})([
  function(module, exports, __webpack_require__) {
    'use strict';
    const security = __webpack_require__(1);
    const telemetry = __webpack_require__(2);

    function verifySoftwareLicense(key, hardwareId) {
      if (!key || key.length !== 29) return { valid: false, reason: 'INVALID_FORMAT' };
      const parts = key.split('-');
      if (parts.length !== 5) return { valid: false, reason: 'BAD_SEGMENTS' };
      
      const checksum = security.computeCRC16(parts[0] + parts[1] + hardwareId);
      const expectedChecksumHex = ('0000' + checksum.toString(16).toUpperCase()).slice(-4);
      
      if (parts[4] !== expectedChecksumHex) {
        telemetry.reportViolation('CHECKSUM_MISMATCH', hardwareId);
        return { valid: false, reason: 'CHECKSUM_FAIL' };
      }
      return { valid: true, tier: parts[0] === 'PRO9' ? 'ENTERPRISE' : 'STANDARD' };
    }
    exports.verifySoftwareLicense = verifySoftwareLicense;
  },
  function(module, exports) {
    'use strict';
    exports.computeCRC16 = function(str) {
      let crc = 0xFFFF;
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if ((crc & 0x8000) !== 0) {
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
          } else {
            crc = (crc << 1) & 0xFFFF;
          }
        }
      }
      return crc;
    };
  },
  function(module, exports) {
    'use strict';
    exports.reportViolation = function(type, hw) {
      fetch('/api/v2/telemetry/security-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, hw, ts: Date.now() })
      }).catch(err => {});
    };
  }
]);

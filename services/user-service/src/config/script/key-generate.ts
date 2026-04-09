const jose = require('jose');

(async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256', {
        modulusLength: 2048,
        extractable  : true,
    });
    console.log('PLATFORM_JWT_PRIVATE_KEY=' + Buffer.from(await jose.exportPKCS8(privateKey)).toString('base64'));
    console.log('PLATFORM_JWT_PUBLIC_KEY='  + Buffer.from(await jose.exportSPKI(publicKey)).toString('base64'));
})();
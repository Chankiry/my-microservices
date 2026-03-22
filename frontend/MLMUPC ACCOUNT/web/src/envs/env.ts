export const env = {

    production    : true,
    APP_VERSION   : require('../../package.json').version,

    API_BASE_URL  : process.env.API_BASE_URL,
    FILE_BASE_URL : process.env.FILE_BASE_URL,
    SOCKET_URL    : process.env.SOCKET_URL,
    WEB_BASE_URL  : 'https://file-v4-api.uat.camcyber.com/'
};

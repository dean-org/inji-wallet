const OPENID4VP_CONNECT_URI = 'OPENID4VP://connect:?';
const OPENID4VP_CONNECT_URI_WITHOUT_SLASHES = /^OPENID4VPconnect:\?/i;

export const normalizeOpenId4VpBleUri = (uri: string) =>
  uri.replace(
    OPENID4VP_CONNECT_URI_WITHOUT_SLASHES,
    OPENID4VP_CONNECT_URI,
  );

export const isOpenId4VpBleUri = (uri: string) =>
  uri.startsWith('OPENID4VP://') ||
  OPENID4VP_CONNECT_URI_WITHOUT_SLASHES.test(uri);

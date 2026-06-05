import {isOpenId4VpBleUri, normalizeOpenId4VpBleUri} from './uri';

describe('openIdBLE uri', () => {
  const canonicalUri =
    'OPENID4VP://connect:?name=OVPMOSIP&key=32b5b42704b0447744ee26466db558fa030222aa46aa5e94eb24d56dcc4e102e';

  it('keeps canonical OpenID4VP BLE URI unchanged', () => {
    expect(normalizeOpenId4VpBleUri(canonicalUri)).toBe(canonicalUri);
  });

  it('normalizes OxygenOS 14 scanner URI without slashes', () => {
    expect(
      normalizeOpenId4VpBleUri(
        'OPENID4VPconnect:?name=OVPMOSIP&key=c211f9b3fbe3a9d142575b352638ef368d2449f22547ee4b9a74f1b72f2f0323',
      ),
    ).toBe(
      'OPENID4VP://connect:?name=OVPMOSIP&key=c211f9b3fbe3a9d142575b352638ef368d2449f22547ee4b9a74f1b72f2f0323',
    );
  });

  it('accepts canonical and OxygenOS 14 OpenID4VP BLE URI formats', () => {
    expect(isOpenId4VpBleUri(canonicalUri)).toBe(true);
    expect(isOpenId4VpBleUri('OPENID4VPconnect:?name=OVPMOSIP')).toBe(true);
  });
});

import { OtpStoreService } from './otp-store.service';

describe('OtpStoreService', () => {
  let store: OtpStoreService;

  beforeEach(() => {
    store = new OtpStoreService();
  });

  it('verifies a code that was just generated', () => {
    const code = store.generate('+919999999999');
    expect(store.verify('+919999999999', code)).toBe(true);
  });

  it('rejects a wrong code', () => {
    store.generate('+919999999999');
    expect(store.verify('+919999999999', '000000')).toBe(false);
  });

  it('rejects verification for a number with no pending OTP', () => {
    expect(store.verify('+918888888888', '123456')).toBe(false);
  });

  it('a code can only be used once', () => {
    const code = store.generate('+919999999999');
    expect(store.verify('+919999999999', code)).toBe(true);
    expect(store.verify('+919999999999', code)).toBe(false);
  });

  it('locks out after too many wrong attempts', () => {
    const code = store.generate('+919999999999');
    for (let i = 0; i < 5; i++) {
      store.verify('+919999999999', '000000');
    }
    expect(store.verify('+919999999999', code)).toBe(false);
  });
});

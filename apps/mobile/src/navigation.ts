export type AuthStackParams = {
  Login: undefined;
  Otp: { phoneNumber: string };
};

// Customer screens that sit above the tabs.
export type CustomerStackParams = {
  CustomerTabs: undefined;
  NewRequest: undefined;
  RequestDetail: { id: string };
  PaymentDetail: { id: string };
};

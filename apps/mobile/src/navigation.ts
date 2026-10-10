export type AuthStackParams = {
  Login: undefined;
  Otp: { phoneNumber: string };
};

export type PaymentsStackParams = {
  PaymentsList: undefined;
  NewPayment: undefined;
  PaymentDetail: { id: string };
};

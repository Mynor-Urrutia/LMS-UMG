export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface ISendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailService {
  send(input: ISendEmailInput): Promise<void>;
}

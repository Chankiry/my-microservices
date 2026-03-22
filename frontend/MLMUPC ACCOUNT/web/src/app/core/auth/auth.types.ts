export interface ResponseSignIn {
    go_to_verify_otp: boolean;
    phone: string;
    email: string;
    message: string;
}

export interface ResponseOTP {
    access_token: string;
    refresh_token: string;
    message: string;
}


export interface ResponseSingUp {
    status: boolean;
    message: string;
    access_token: string
}

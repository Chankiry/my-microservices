class GlobalConstants {
    static info(arg0: string, info: any) {
        throw new Error('Method not implemented.');
    }
    //Message
    public static genericError: string = 'Something went wrong. Please try again later';
    public static genericResponse: string = 'Your request has been processed successfully';

    //Regex
    public static emailRegex: string = '[A-Za-z0-9._%-]+@[A-Za-z0-9._%-]+\\.[a-z]{2,3}';
    public static phoneRegex: string = '/^(\+855|0)[1-9]\d{7,8}$/';
    public static khmerRegex: string = '^[\u1780-\u17FF\u19E0-\u19FF\u0020\u200B\s]+$';

    //Error
    public static error: string = 'error';

    //Success
    public static success: string = 'success';

    //Auth
    public static unauthorized: string = 'You are not authorize person to access this page';
}

export default GlobalConstants;

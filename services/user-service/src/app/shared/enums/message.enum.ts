import { BaseTranslate } from "./translate.enum";

export const MESSAGE = {
    SUCCESS           : new BaseTranslate('ជោគជ័យ', 'Success'),
    DELETE_SUCCESS    : new BaseTranslate('ការលុបទទួលបានជោគជ័យ', 'Deleted successfully'),
    ALREADY_EXISTS    : new BaseTranslate('មានរួចហើយ', 'Already exists'),
    NOTFOUND          : new BaseTranslate('រកមិនឃើញ', 'Not Found'),
};

export const ERROR_MESSAGE = {
    // SYSTEM ERRORS
    UNAUTHORIZED                : new BaseTranslate('Unauthorized to perform action.'),
    FORBIDDEN                   : new BaseTranslate('You do not have permission to perform action or access this resource.'),
    SOMETHING_WRONG             : new BaseTranslate('Something went wrong. Please try again later.'),
    OPERATION_FAILED            : new BaseTranslate('Operation failed. Please try again later.'),
    ERROR_SAVING_FILE           : new BaseTranslate('An error occurred while saving the file. Please try again.'),
    METHOD_NOT_ALLOW            : new BaseTranslate('Method not allowed.'),
    TOO_MANY_OPERATIONS         : new BaseTranslate('Too many requests. Please try again later.'),
    DATA_INVALID                : new BaseTranslate('Invalid data. Please check and try again.'),
    INVALID_REVIEW_STATUS       : new BaseTranslate('The request is not in a reviewing state.'),
    DEPARTMENT_ALREADY_ASSIGNED : new BaseTranslate('Department already assigned to this user.'),

    // FORMAT VALIDATION ERRORS
    WRONG_FORMAT_EMAIL          : new BaseTranslate('Invalid email format. Please check and try again.'),
    WRONG_FORMAT_PHONE          : new BaseTranslate('Invalid phone number format. Please check and try again.'),
    WRONG_FORMAT_EMAIL_OR_PHONE : new BaseTranslate('Invalid email or phone number format. Please check and try again.'),
    VALIDATION_FAIL             : new BaseTranslate('Validation failed. Please review the input and try again.'),

    // USER-RELATED ERRORS
    DATA_ALREADY_FOUND                          : new BaseTranslate('Data already exist. Please check the details and try again.'),
    USER_NOT_FOUND                              : new BaseTranslate('អ្នកប្រើប្រាស់មិនមាន', 'User does not exist. Please check the details and try again.'),
    USER_ALREADY_EXIST                          : new BaseTranslate('User already exists. Please use a different username or email.'),
    COMMENT_ALREADY_EXISTS                      : new BaseTranslate('Comment already exists.'),
    USER_TERMINATED                             : new BaseTranslate('User account has been terminated.'),
    PHONE_NUMBER_ALREADY_REGISTERED             : new BaseTranslate('This phone number is already registered.'),
    PHONE_NUMBER_ALREADY_EXISTED                : new BaseTranslate('Phone number already existed.'),
    USERNAME_ALREADY_EXISTED                    : new BaseTranslate('Username already existed.'),

    // NOT FOUND
    NOTIFICATION_NOT_FOUND      : new BaseTranslate('Notification not found. Please verify the details and try again.'),
    KEYWORD_NOT_FOUND           : new BaseTranslate('Keyword not found.'),
    REQUEST_NOT_FOUND           : new BaseTranslate('Request not found.'),
    REQUEST_TYPE_NOT_FOUND      : new BaseTranslate('Request type not found.'),
    REQUEST_STATUS_NOT_FOUND    : new BaseTranslate('Request status not found.'),
    FLOW_NOT_FOUND              : new BaseTranslate('Flow not found.'),
    FLOW_USER_NOT_FOUND         : new BaseTranslate('Flow user not found.'),

    // INVALID DATA
    INVALID_DATE_RANGE          : new BaseTranslate('Start date cannot be after end date'),
    DECRYPTION_FAILED           : new BaseTranslate('Failed to decrypt payload: invalid format or key mismatch.'),

    // Children Check
    HAVE_CHILDREN               : new BaseTranslate('Cannot delete department with child departments'),
    HAVE_USER                   : new BaseTranslate('User exist in this department'),
    USER_HAS_NO_DEPARTMENT      : new BaseTranslate('User does not exist in this department'),

    // Medal
    MEDAL_NOT_FOUND             : new BaseTranslate('Medal not found'),

    INVALID_ACTION              : new BaseTranslate('Invalid action.'),
    INVALID_DATE                : new BaseTranslate('Invalid date.'),
};

export const PROFILE_MESSAGE = {
    UPDATE_SUCCESS              : new BaseTranslate('កែប្រែប្រវត្តិរូបបានជោគជ័យ', 'Profile updated successfully'),
    CHANGE_PASSWORD_SUCCESS     : new BaseTranslate('ប្ដូរពាក្យសម្ងាត់បានជោគជ័យ', 'Password changed successfully'),
    CHANGE_EMAIL_SUCCESS        : new BaseTranslate('ប្ដូរអ៊ីមែលបានជោគជ័យ', 'Email changed successfully'),
    CHANGE_PHONE_SUCCESS        : new BaseTranslate('ប្ដូរទូរស័ព្ទបានជោគជ័យ', 'Phone number changed successfully'),
};

export const PROFILE_ERROR_MESSAGE = {
    CURRENT_PASSWORD_INCORRECT  : new BaseTranslate('ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ', 'Current password is incorrect. Please check and try again.'),
    EMAIL_ALREADY_REGISTERED    : new BaseTranslate('អ៊ីមែលនេះបានចុះឈ្មោះរួចហើយ', 'This email address is already registered. Please use a different email.'),
    PHONE_ALREADY_REGISTERED    : new BaseTranslate('លេខទូរស័ព្ទនេះបានចុះឈ្មោះរួចហើយ', 'This phone number is already registered. Please use a different phone number.'),
    // Added: user account not linked to Keycloak identity provider
    NOT_LINKED_TO_IDP           : new BaseTranslate('គណនីមិនបានភ្ជាប់ជាមួយប្រព័ន្ធផ្ទៀងផ្ទាត់', 'User account is not linked to the identity provider.'),
};

export const AUTH_MESSAGE = {
    REGISTRATION_SUCCESS        : new BaseTranslate('ការចុះឈ្មោះបានជោគជ័យ។ សូមចូលប្រព័ន្ធ', 'Registration successful. Please log in.'),
    LOGIN_SUCCESS               : new BaseTranslate('ចូលប្រព័ន្ធបានជោគជ័យ', 'Login successful.'),
    LOGOUT_SUCCESS              : new BaseTranslate('ចេញពីប្រព័ន្ធបានជោគជ័យ', 'Logout successful.'),
    TOKEN_REFRESH_SUCCESS       : new BaseTranslate('បង្កើត token ថ្មីបានជោគជ័យ', 'Token refreshed successfully.'),
};

export const AUTH_ERROR_MESSAGE = {
    INVALID_CREDENTIALS         : new BaseTranslate('ឈ្មោះអ្នកប្រើ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវ', 'Invalid credentials provided. Please check and try again.'),
};

export const LINK_MESSAGE = {
    LINK_INITIATED  : new BaseTranslate('បង្កើតការភ្ជាប់ទំនាក់ទំនងបានជោគជ័យ', 'Link session created successfully'),
    LINK_CONFIRMED  : new BaseTranslate('ភ្ជាប់គណនីបានជោគជ័យ', 'Account linked successfully'),
};
 
export const LINK_ERROR_MESSAGE = {
    SESSION_NOT_FOUND    : new BaseTranslate('វគ្គភ្ជាប់មិនមាន ឬ ផុតកំណត់', 'Link session not found or has expired'),
    SESSION_ALREADY_USED : new BaseTranslate('វគ្គភ្ជាប់នេះត្រូវបានប្រើប្រាស់រួចហើយ', 'This link session has already been confirmed'),
    INVALID_SECRET       : new BaseTranslate('សំណុំសម្ងាត់មិនត្រឹមត្រូវ', 'Invalid internal service secret'),
    SCOPE_MISMATCH       : new BaseTranslate('វគ្គភ្ជាប់មិនស្ថិតនៅក្រោមប្រព័ន្ធនេះ', 'Link session does not belong to this system'),
};


export const SYSTEM_MESSAGE = {
    CONNECT_SUCCESS     : new BaseTranslate('ភ្ជាប់ប្រព័ន្ធបានជោគជ័យ', 'System connected successfully'),
    DISCONNECT_SUCCESS  : new BaseTranslate('ដាច់ភ្ជាប់ប្រព័ន្ធបានជោគជ័យ', 'System disconnected successfully'),
    LINK_INITIATED      : new BaseTranslate('ចាប់ផ្ដើមការភ្ជាប់ប្រព័ន្ធ', 'System link initiated successfully'),
    LINK_CONFIRMED      : new BaseTranslate('ភ្ជាប់ប្រព័ន្ធបានជោគជ័យ', 'System linked successfully'),
};
 
export const SYSTEM_ERROR_MESSAGE = {
    SYSTEM_NOT_FOUND            : new BaseTranslate('ប្រព័ន្ធនេះមិនមាន', 'System not found. Please check the details and try again.'),
    SYSTEM_INACTIVE             : new BaseTranslate('ប្រព័ន្ធនេះមិនមានសកម្ម', 'System is inactive. Please contact your administrator.'),
    INVALID_CREDENTIALS         : new BaseTranslate('សមត្ថកិច្ចដែលផ្ដល់មិនត្រឹមត្រូវ', 'Invalid credentials provided. Please check and try again.'),
    CONNECTION_FAILED           : new BaseTranslate('មិនអាចភ្ជាប់ប្រព័ន្ធបាន សូមព្យាយាមម្ដងទៀត', 'Failed to connect to the system. Please try again.'),
    SYSTEM_ALREADY_CONNECTED    : new BaseTranslate('អ្នកបានភ្ជាប់ប្រព័ន្ធនេះរួចហើយ', 'You have already connected to this system.'),
    SYSTEM_DISCONNECTION_FAILED : new BaseTranslate('ការដាច់ភ្ជាប់បរាជ័យ', 'Failed to disconnect from the system. Please try again.'),
    SYSTEM_NOT_ALLOW_CONNECTION : new BaseTranslate('ប្រព័ន្ធនេះមិនគាំទ្រការភ្ជាប់ដោយលេខសំងាត់', 'This system does not allow credential-based connection.'),
    ACCESS_NOT_FOUND            : new BaseTranslate('ការភ្ជាប់នេះមិនមាន', 'Connection record not found.'),
    ACCESS_DENIED               : new BaseTranslate('អ្នកមិនមានសិទ្ធិចូលប្រព័ន្ធនេះ', 'You do not have access to this system.'),
    NOT_CONNECTED               : new BaseTranslate('អ្នកមិនទាន់ភ្ជាប់ប្រព័ន្ធនេះ', 'You have not connected to this system yet.'),
    NO_BASE_URL                 : new BaseTranslate('ប្រព័ន្ធនេះមិនមានអាស័យដ្ឋាន URL', 'This system has no base URL configured.'),
    NO_REDIRECT_URL             : new BaseTranslate('ប្រព័ន្ធនេះមិនមានការកំណត់ redirect URL', 'This system has no redirect URL configured.'),
    INVALID_REDIRECT_URI        : new BaseTranslate('redirect_uri មិនត្រូវនឹងប្រព័ន្ធដែលបានចុះឈ្មោះ', 'The redirect URI does not match the registered system URL.'),
    SSO_NOT_SUPPORTED           : new BaseTranslate('ប្រព័ន្ធនេះមិនគាំទ្រ SSO', 'This system does not support SSO.'),
    SSO_FAILED                  : new BaseTranslate('មិនអាចភ្ជាប់ប្រព័ន្ធបានតាមរយៈ SSO', 'Failed to connect to the system via SSO. Please try again.'),
    // Phase 3 additions
    NO_LINK_ENTRY_URL           : new BaseTranslate('ប្រព័ន្ធនេះមិនមាន URL សម្រាប់ការភ្ជាប់', 'This system has no link entry URL configured.'),
    LINK_SESSION_NOT_FOUND      : new BaseTranslate('សម័យភ្ជាប់មិនមាន ឬ បានផុតកំណត់', 'Link session not found or has expired.'),
    LINK_SESSION_WRONG_STEP     : new BaseTranslate('ស្ថានភាពភ្ជាប់មិនត្រឹមត្រូវ', 'Link session is not in the expected state.'),
    INVALID_INTERNAL_SECRET     : new BaseTranslate('Secret មិនត្រឹមត្រូវ', 'Invalid internal service secret.'),
};
 
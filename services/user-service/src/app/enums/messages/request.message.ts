import { BaseTranslate } from "../translate.enum"

// export const REQUEST_MESSAGE = (param) => {
//     return {
//         REQUEST_HAS_BEEN_PERFORMED : new BaseTranslate(`សំណើបានចាត់វិធានការរួចហើយដោយ ${param.name_kh}!` ,`Request have already taked action by ${param.name_en}!`)
//         , OTHER : new BaseTranslate(`${param.value_1}!` ,`${param.value_2}!`)
//         , REVIEWER_AND_APPROVER_IS_REQUIRED: new BaseTranslate('សូមជ្រើសរើសយ៉ាងហោចណាស់អ្នកត្រួតពិនិត្យម្នាក់ និងអ្នកអនុម័តម្នាក់!', 'Please select at least one reviewer and one approver!')
//         , USER_HAS_REACH_LIMIT_REQUEST_TYPE: new BaseTranslate(`${param.name_kh} បានឈានដល់ដែនកំណត់សម្រាប់ប្រភេទសំណើមួយនេះ បានប្រើប្រាស់: ${param.used} - ច្រើនបំផុតក្នុងមួយឆ្នាំ: ${param.limit}`, `${param.name_en} has reach limit day for current request type USED: ${param.used} - LIMIT PER YEAR: ${param.limit}`)
//         , REQUEST_CREATED_TITLE: new BaseTranslate(`${param.name_kh} បានស្នើសុំច្បាប់`, `${param.name_en} have been requested.`)
//         , REQUEST_CREATED_TOPIC: new BaseTranslate(`${param.name_kh} បានដាក់ ${param.request_category_type_name_kh} ចំនួន ${param.num_day} ថ្ងៃ គិតពឺថ្ងៃ ${param.start_date_name_kh} ដល់ ${param.end_date_name_kh}។ មូលហេតុ៖ ${param.objective_name_kh}`, `${param.name_en} have created ${param.request_category_type_name_en} for ${param.num_day} days starting from ${param.start_date_name_en} to ${param.end_date_name_en}. Reason: ${param.objective_name_en}`)
//         , REQUEST_REVIEW_TITLE: new BaseTranslate(`សូមត្រួតពិនិត្យសំណើរ`, `Please review the request.`)
//         , REQUEST_REVIEW_TOPIC: new BaseTranslate(`${param.name_kh} បានស្នើសុំ៎អ្នកត្រួតពិនិត្យសំណើរ`, `${param.name_en} have been requested you to review.`)
//         , REQUEST_APPROVED_TITLE: new BaseTranslate(`សំណើរបស់អ្នកបានអនុម័ត`, `Your request have been approved.`)
//         , NO_ORG_ADMIN: new BaseTranslate(`ស្ថាប័នរបស់អ្នកមិនមានអ្នកគណនីរដ្ឋបាលនៅឡើយទេ`, `Your organization have no admin account.`)
//     }
// }

export const REQUEST_MESSAGE = (param) => {
    return {
        REQUEST_HAS_BEEN_PERFORMED : new BaseTranslate(`សំណើបានចាត់វិធានការរួចហើយដោយ ${param.name_kh}!` ,`Request have already taked action by ${param.name_en}!`)
        , OTHER : new BaseTranslate(`${param.value_1}!` ,`${param.value_2}!`)
        , REVIEWER_AND_APPROVER_IS_REQUIRED: new BaseTranslate('សូមជ្រើសរើសយ៉ាងហោចណាស់អ្នកត្រួតពិនិត្យម្នាក់ និងអ្នកអនុម័តម្នាក់!', 'Please select at least one reviewer and one approver!')
        , USER_HAS_REACH_LIMIT_REQUEST_TYPE: new BaseTranslate(`${param.name_kh} បានឈានដល់ដែនកំណត់សម្រាប់ប្រភេទសំណើមួយនេះ បានប្រើប្រាស់: ${param.used} - ច្រើនបំផុតក្នុងមួយឆ្នាំ: ${param.limit}`, `${param.name_en} has reach limit day for current request type USED: ${param.used} - LIMIT PER YEAR: ${param.limit}`)
        , REQUEST_CREATED_TITLE: new BaseTranslate(`${param.name_kh} បានស្នើសុំច្បាប់ឈប់សម្រាក់`, `${param.name_en} requested​ for leave request.`)

        , REQUEST_CREATED_TOPIC: new BaseTranslate(
            // 🇰🇭 Khmer
            param.num_day === 1
                ? `${param.name_kh} បានស្នើ${param.request_category_type_name_kh} នៅថ្ងៃទី ${param.start_date_name_kh}។`
                : param.end_date_name_kh && /^\d+$/.test(param.end_date_name_kh)
                    // same month → day range + month/year once
                    ? `${param.name_kh} បានស្នើ${param.request_category_type_name_kh} ចាប់ពី ${param.start_date_name_kh.split(' ')[0]} ដល់ ${param.end_date_name_kh} ${param.start_date_name_kh.split(' ').slice(1).join(' ')}។`
                    // different month
                    : `${param.name_kh} បានស្នើ${param.request_category_type_name_kh} ចាប់ពី ${param.start_date_name_kh} ដល់ ${param.end_date_name_kh}។`,

            // 🇺🇸 English
            param.num_day === 1
                ? `${param.name_en} requested ${param.request_category_type_name_en} on ${param.start_date_name_en}.`
                : param.end_date_name_en && /^\d+$/.test(param.end_date_name_en)
                    // same month → day range + month/year once
                    ? `${param.name_en} requested ${param.request_category_type_name_en} from ${param.start_date_name_en.split('-')[2]} to ${param.end_date_name_en} ${param.start_date_name_en.slice(0, 7)}.`
                    // different month
                    : `${param.name_en} requested ${param.request_category_type_name_en} from ${param.start_date_name_en} to ${param.end_date_name_en}.`
        )



        , REQUEST_REVIEW_TITLE: new BaseTranslate(`សូមត្រួតពិនិត្យសំណើ`, `Please review the request.`)
        , REQUEST_REVIEW_TOPIC: new BaseTranslate(`${param.name_kh} បានស្នើសុំ៎អ្នកត្រួតពិនិត្យសំណើ`, `${param.name_en} have been requested you to review.`)
        , REQUEST_APPROVED_TITLE: new BaseTranslate(`សំណើសុំច្បាប់របស់អ្នកត្រូវបានអនុម័ត`, `Your leave request have been approved.`)
        , REQUEST_APPROVED_TOPIC: new BaseTranslate(`${param.name_kh} បានអនុម័តសំណើររបស់អ្នក`, `${param.name_en} approved your request.`)
        , REQUEST_REJECT_TITLE: new BaseTranslate(`សំណើសុំច្បាប់របស់អ្នកត្រូវបានបដិសេធសំណើរ`, `Your leave request have been rejected.`)
        , REQUEST_REJECT_TOPIC: new BaseTranslate(`${param.name_kh} បានបដិសេធសំណើររបស់អ្នក`, `${param.name_en} rejected your request.`)
        , REQUEST_CC_TOPIC: new BaseTranslate(`សូមទទួលជ្រាបដោយក្តីអនុគ្រោះ!`, `Please be kindly informed!`)
        , NO_ORG_ADMIN: new BaseTranslate(`ស្ថាប័នរបស់អ្នកមិនមានអ្នកគណនីរដ្ឋបាលនៅឡើយទេ`, `Your organization have no admin account.`)
    }
}
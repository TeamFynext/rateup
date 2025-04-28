import {parsePhoneNumber} from "libphonenumber-js"

export const convertFullPhoneNumToCoutryCodeAndNationalNum = (fullPhoneNum:string) => {

    const num = parsePhoneNumber(fullPhoneNum);

    return {country_code:num.countryCallingCode, national_number:num.nationalNumber}

}

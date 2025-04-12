import SuperTokens from "supertokens-react-native"

export const checkAuth = async() => {
    const sessionExists = await SuperTokens.doesSessionExist();
    return sessionExists;
}

export const checkAuthAndGetToken = async() => {
    const sessionExists = await SuperTokens.doesSessionExist();
    if(!sessionExists){
        return null
    }
    const token = await SuperTokens.getAccessToken();
    return token
} 
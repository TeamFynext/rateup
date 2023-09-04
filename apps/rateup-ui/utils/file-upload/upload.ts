import axios from 'axios';

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/public/upload/file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response?.data?.data?.key;
    } catch (error) {
      console.error(error);
      return null;
    }
};


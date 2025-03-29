export const uploadFile = async (file, folder) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "chatapp-for-saas");
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/dw88a5fct/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  return data.secure_url;
};

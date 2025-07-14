// src/utils/boxUpload.ts

export async function uploadToBox(file: File, folderId: string, accessToken: string) {
  const formData = new FormData();
  formData.append(
    'attributes',
    JSON.stringify({
      name: file.name,
      parent: { id: folderId },
    })
  );
  formData.append('file', file);

  const response = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Box upload failed: ${errorText}`);
  }

  return response.json();
}

// upload.js
import { db, auth } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const tagsInput = document.getElementById("tags");

window.uploadMemory = async function () {
    const file = document.getElementById("fileInput").files[0];
    const caption = document.getElementById("caption").value;

    if (!file || !caption) {
        alert("Please upload a file and write a caption.");
        return;
    }

    const tags = tagsInput.value
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag !== "");

    const isVideo = file.type.startsWith("video");
    const cloudinaryUrl = isVideo
        ? "https://api.cloudinary.com/v1_1/dv9vum0vn/video/upload"
        : "https://api.cloudinary.com/v1_1/dv9vum0vn/image/upload";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "ml_default");

    try {
        const res = await fetch(cloudinaryUrl, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        const mediaURL = data.secure_url;

        const user = auth.currentUser;
        if (!user) {
            alert("Please log in first.");
            return;
        }

        await addDoc(collection(db, "memories"), {
            userId: user.uid,
            url: mediaURL,
            caption: caption,
            type: isVideo ? "video" : "image",
            tags: tags,
            createdAt: new Date()
        });

        alert("Upload successful!");
        window.location.href = "viewgallery.html";

    } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed. Please try again.");
    }
};

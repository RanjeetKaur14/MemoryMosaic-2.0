import { db, auth } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("UPLOAD.JS LOADED");

async function uploadMemory() {
    console.log("UPLOAD STARTED");

    const fileInput = document.getElementById("fileInput");
    const captionInput = document.getElementById("caption");
    const tagsInput = document.getElementById("tags");

    const file = fileInput.files[0];
    const caption = captionInput.value;

    if (!file || !caption) {
        alert("Please upload a file and write a caption.");
        return;
    }

    const tags = tagsInput.value
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag !== "");

    console.log("TAGS:", tags);

    const isVideo = file.type.startsWith("video");
    const cloudinaryUrl = isVideo
        ? "https://api.cloudinary.com/v1_1/duidmroqa/video/upload"
        : "https://api.cloudinary.com/v1_1/duidmroqa/image/upload";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "memory_mosaic_unsigned");

    try {
        console.log("UPLOADING TO CLOUDINARY");

        const res = await fetch(cloudinaryUrl, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }

        const data = await res.json();
        console.log("CLOUDINARY RESPONSE:", data);

        const user = auth.currentUser;
        if (!user) {
            alert("Please log in first.");
            return;
        }

        await addDoc(collection(db, "memories"), {
            userId: user.uid,
            url: data.secure_url,
            caption,
            tags,
            type: isVideo ? "video" : "image",
            createdAt: new Date()
        });

        alert("Upload successful!");
        window.location.href = "viewgallery.html";

    } catch (err) {
        console.error("UPLOAD FAILED:", err);
        alert("Upload failed. Check console.");
    }
}

/* 🔥 THIS IS THE FIX 🔥 */
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("uploadBtn");
    btn.addEventListener("click", uploadMemory);
});

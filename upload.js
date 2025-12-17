import { db, auth } from './firebase.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("UPLOAD.JS LOADED");
let currentUser = null;

import { onAuthStateChanged } from 
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Monitor auth state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log("Auth state changed:", user ? "User logged in" : "No user");
});

// Helper to wait for auth
async function waitForAuth() {
  return new Promise((resolve) => {
    if (currentUser?.uid) {
      console.log("Auth already ready");
      resolve(currentUser);
      return;
    }
    
    console.log("Waiting for auth...");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth callback received:", user?.uid);
      unsubscribe();
      resolve(user);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      unsubscribe();
      console.log("Auth wait timeout");
      resolve(null);
    }, 5000);
  });
}

async function uploadMemory() {
    const btn = document.getElementById("uploadBtn");
    btn.disabled = true;
    btn.innerText = "Uploading...";

    console.log("========== UPLOAD STARTED ==========");
    console.log("Initial auth state:", currentUser?.uid || "No user");

    // Step 1: Wait for auth if needed
    if (!currentUser?.uid) {
        console.log("Auth not ready, waiting...");
        currentUser = await waitForAuth();
        
        if (!currentUser?.uid) {
            alert("❌ Please sign in first! Redirecting to home page...");
            window.location.href = "index.html";
            btn.disabled = false;
            btn.innerText = "Upload Memory";
            return;
        }
    }
    
    console.log("✅ User authenticated:", currentUser.uid);

    // Step 2: Get form data
    const fileInput = document.getElementById("fileInput");
    const captionInput = document.getElementById("caption");
    const tagsInput = document.getElementById("tags");

    const file = fileInput.files[0];
    const caption = captionInput.value;

    if (!file || !caption) {
        alert("Please upload a file and write a caption.");
        btn.disabled = false;
        btn.innerText = "Upload Memory";
        return;
    }

    const tags = tagsInput.value
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag !== "");

    console.log("📝 Caption:", caption);
    console.log("🏷️ Tags:", tags);
    console.log("📁 File type:", file.type);

    // Step 3: Prepare Cloudinary upload
    const isVideo = file.type.startsWith("video");
    const cloudinaryUrl = isVideo
        ? "https://api.cloudinary.com/v1_1/duidmroqa/video/upload"
        : "https://api.cloudinary.com/v1_1/duidmroqa/image/upload";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "memory_mosaic_unsigned");

    try {
        console.log("☁️ Uploading to Cloudinary...");

        const res = await fetch(cloudinaryUrl, {
            method: "POST",
            body: formData
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Cloudinary error: ${txt}`);
        }

        const data = await res.json();
        console.log("✅ Cloudinary RESPONSE:", data);

        const mediaURL = data.secure_url; 
        console.log("📸 Media URL:", mediaURL);

        if (!mediaURL) {
            throw new Error("❌ Cloudinary did not return a URL");
        }

        // Step 4: Save to Firebase
        console.log("🔥 Saving to Firebase Firestore...");
        
        const memoryData = {
            userId: currentUser.uid,
            url: mediaURL,
            caption: caption,
            tags: tags,
            type: isVideo ? "video" : "image",
            createdAt: new Date(),
            email: currentUser.email || "unknown"
        };
        
        console.log("Firestore data:", memoryData);

        const docRef = await addDoc(collection(db, "memories"), memoryData);
        
        console.log("✅ Firestore SUCCESS!");
        console.log("📄 Document ID:", docRef.id);
        console.log("🔄 REDIRECTING TO VIEW PAGE...");

        // Step 5: Redirect
        setTimeout(() => {
            window.location.href = `view.html?id=${docRef.id}`;
        }, 100);

    } catch (err) {
        console.error("❌ UPLOAD FAILED:", err);
        console.error("Error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
        
        let errorMsg = "Upload failed. ";
        if (err.message.includes("permission-denied")) {
            errorMsg += "Firestore permission denied. Check Firebase rules.";
        } else if (err.message.includes("network")) {
            errorMsg += "Network error. Check your connection.";
        } else {
            errorMsg += err.message;
        }
        
        alert(errorMsg);
        btn.disabled = false;
        btn.innerText = "Upload Memory";
    }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
    console.log("📄 DOM loaded, setting up upload button");
    
    const btn = document.getElementById("uploadBtn");
    if (!btn) {
        console.error("❌ Upload button not found!");
        return;
    }
    
    console.log("✅ Upload button found, adding listener");
    btn.addEventListener("click", uploadMemory);
    
    // Log initial state
    console.log("Initial setup complete");
    console.log("Current user on load:", currentUser?.uid || "No user");
});

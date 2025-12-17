// viewgallery.js
import { db, auth } from './firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const gallery = document.getElementById("gallery");

// Create lightbox element
const lightbox = document.createElement("div");
lightbox.id = "lightbox";
lightbox.innerHTML = `
  <div id="lightbox-content">
    <span class="close-lightbox">&times;</span>
  </div>
`;
document.body.appendChild(lightbox);

const lightboxContent = document.getElementById("lightbox-content");
const closeBtn = lightboxContent.querySelector(".close-lightbox");

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target === closeBtn) {
    lightbox.classList.remove("active");
    lightboxContent.innerHTML = `<span class="close-lightbox">&times;</span>`;
  }
});

// Show loading state
function showLoading() {
  gallery.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading your memories...</p>
    </div>
  `;
}

// Show empty state
function showEmptyState() {
  gallery.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-images"></i>
      <h3>No Memories Yet</h3>
      <p>Upload your first memory to see it here!</p>
      <a href="upload.html" class="btn-upload">Upload Memory</a>
    </div>
  `;
}

// Show error state
function showError(message) {
  gallery.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error Loading Memories</h3>
      <p>${message}</p>
      <button onclick="window.location.reload()">Try Again</button>
    </div>
  `;
}

async function loadMemories(userId) {
  try {
    showLoading();
    
    console.log("Loading memories for user:", userId);
    
    // Query Firestore
    const q = query(
      collection(db, "memories"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    
    console.log("Found", snapshot.size, "memories");
    
    // Clear gallery
    gallery.innerHTML = "";
    
    if (snapshot.empty) {
      showEmptyState();
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const memoryCard = document.createElement("div");
      memoryCard.className = "polaroid";
      memoryCard.dataset.id = doc.id;

      // Format time
      let formattedTime = "Unknown date";
      try {
        const createdAt = data.createdAt?.toDate?.() || new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        formattedTime = createdAt.toLocaleDateString('en-GB', options);
      } catch (e) {
        console.warn("Date formatting error:", e);
      }

      // Create media element
      let mediaHTML = "";
      if (data.type === "video") {
        mediaHTML = `
          <div class="video-thumbnail">
            <video src="${data.url}" muted loop playsinline></video>
            <div class="video-icon">
              <i class="fas fa-play"></i>
            </div>
          </div>
        `;
      } else {
        mediaHTML = `<img src="${data.url}" alt="${data.caption || 'Memory Photo'}" loading="lazy">`;
      }

      // Create tags display if available
      let tagsHTML = "";
      if (data.tags && data.tags.length > 0) {
        tagsHTML = `
          <div class="tags">
            ${data.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
          </div>
        `;
      }

      memoryCard.innerHTML = `
        ${mediaHTML}
        <div class="polaroid-content">
          <p class="caption">${data.caption || "No caption"}</p>
          ${tagsHTML}
          <p class="album-time">${formattedTime}</p>
        </div>
      `;

      // Click to open lightbox
      memoryCard.addEventListener("click", () => {
        lightbox.classList.add("active");
        if (data.type === "video") {
          lightboxContent.innerHTML = `
            <span class="close-lightbox">&times;</span>
            <video src="${data.url}" autoplay controls></video>
            <p class="lightbox-caption">${data.caption || ""}</p>
          `;
        } else {
          lightboxContent.innerHTML = `
            <span class="close-lightbox">&times;</span>
            <img src="${data.url}" alt="${data.caption || 'Memory'}">
            <p class="lightbox-caption">${data.caption || ""}</p>
          `;
        }
      });

      gallery.appendChild(memoryCard);
    });

  } catch (error) {
    console.error("Error loading memories:", error);
    
    if (error.code === "permission-denied") {
      showError("Permission denied. Please check Firestore security rules.");
    } else if (error.code === "failed-precondition") {
      showError("Firestore query requires an index. Please create the index in Firebase Console.");
    } else {
      showError(error.message || "Failed to load memories");
    }
  }
}

// Wait for auth state before loading
document.addEventListener("DOMContentLoaded", () => {
  console.log("Gallery page loaded, checking auth...");
  
  showLoading();
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User authenticated:", user.uid);
      loadMemories(user.uid);
    } else {
      console.log("No user logged in");
      gallery.innerHTML = `
        <div class="auth-required">
          <i class="fas fa-lock"></i>
          <h3>Sign In Required</h3>
          <p>Please sign in to view your memories</p>
          <a href="index.html" class="btn-login">Go to Login</a>
        </div>
      `;
    }
  });
});

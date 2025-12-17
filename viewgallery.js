// viewgallery.js
import { db, auth } from './firebase.js';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  where,
  deleteDoc,
  doc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const gallery = document.getElementById("gallery");

// Create lightbox element
const lightbox = document.createElement("div");
lightbox.id = "lightbox";
lightbox.innerHTML = `
  <div id="lightbox-content">
    <div class="lightbox-header">
      <button class="lightbox-delete-btn" style="display:none">
        <i class="fas fa-trash"></i> Delete
      </button>
      <span class="close-lightbox">&times;</span>
    </div>
    <div class="lightbox-media"></div>
    <div class="lightbox-info">
      <p class="lightbox-caption"></p>
      <p class="lightbox-date"></p>
    </div>
  </div>
`;
document.body.appendChild(lightbox);

const lightboxContent = document.getElementById("lightbox-content");
const lightboxMedia = lightboxContent.querySelector(".lightbox-media");
const lightboxCaption = lightboxContent.querySelector(".lightbox-caption");
const lightboxDate = lightboxContent.querySelector(".lightbox-date");
const closeBtn = lightboxContent.querySelector(".close-lightbox");
const deleteBtn = lightboxContent.querySelector(".lightbox-delete-btn");

let currentMemoryId = null;
let currentMemoryData = null;

// Delete memory function
async function deleteMemory(memoryId) {
  if (!confirm("Are you sure you want to delete this memory? This action cannot be undone.")) {
    return;
  }

  try {
    console.log("Deleting memory:", memoryId);
    
    // Show loading on delete button
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    
    // Delete from Firestore
    await deleteDoc(doc(db, "memories", memoryId));
    
    console.log("Memory deleted successfully");
    
    // Close lightbox
    lightbox.classList.remove("active");
    
    // Remove from UI
    const memoryCard = document.querySelector(`[data-id="${memoryId}"]`);
    if (memoryCard) {
      memoryCard.style.opacity = "0.5";
      setTimeout(() => {
        memoryCard.remove();
        
        // Check if gallery is empty now
        if (gallery.children.length === 0) {
          showEmptyState();
        }
      }, 300);
    }
    
    // Show success message
    showToast("Memory deleted successfully!", "success");
    
  } catch (error) {
    console.error("Error deleting memory:", error);
    showToast("Failed to delete memory: " + error.message, "error");
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.disabled = false;
  }
}

// Toast notification function
function showToast(message, type = "info") {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">&times;</button>
  `;
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  
  // Close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
}

// Lightbox event listeners
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target === closeBtn) {
    lightbox.classList.remove("active");
    deleteBtn.style.display = "none";
    currentMemoryId = null;
  }
});

deleteBtn.addEventListener("click", () => {
  if (currentMemoryId) {
    deleteMemory(currentMemoryId);
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
        const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
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

      // Add delete button to each memory card
      const deleteIconHTML = `
        <button class="delete-memory-btn" data-id="${doc.id}">
          <i class="fas fa-trash"></i>
        </button>
      `;

      memoryCard.innerHTML = `
        ${mediaHTML}
        <div class="polaroid-content">
          <div class="memory-header">
            <p class="caption">${data.caption || "No caption"}</p>
            ${deleteIconHTML}
          </div>
          ${tagsHTML}
          <p class="album-time">${formattedTime}</p>
        </div>
      `;

      // Click to open lightbox
      memoryCard.addEventListener("click", (e) => {
        // Don't open lightbox if delete button was clicked
        if (e.target.closest('.delete-memory-btn')) return;
        
        currentMemoryId = doc.id;
        currentMemoryData = data;
        
        lightbox.classList.add("active");
        deleteBtn.style.display = "block";
        
        // Clear previous content
        lightboxMedia.innerHTML = "";
        lightboxCaption.textContent = "";
        lightboxDate.textContent = "";
        
        // Set new content
        if (data.type === "video") {
          const video = document.createElement("video");
          video.src = data.url;
          video.controls = true;
          video.autoplay = true;
          lightboxMedia.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = data.url;
          img.alt = data.caption || "Memory";
          lightboxMedia.appendChild(img);
        }
        
        lightboxCaption.textContent = data.caption || "";
        lightboxDate.textContent = formattedTime;
      });

      // Delete button event
      const deleteBtn = memoryCard.querySelector('.delete-memory-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent lightbox from opening
        deleteMemory(doc.id);
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

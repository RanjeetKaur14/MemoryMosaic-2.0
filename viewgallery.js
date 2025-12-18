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

// Create tag filter container
const tagFilterContainer = document.createElement("div");
tagFilterContainer.className = "tag-filter-container";
tagFilterContainer.innerHTML = `
  <div class="tag-filter-header">
    <h3>Filter by Tags</h3>
    <button class="clear-filter-btn" style="display:none">
      <i class="fas fa-times"></i> Clear Filter
    </button>
  </div>
  <div class="tag-filter-tags">
    <div class="loading-tags">Loading tags...</div>
  </div>
`;

// Insert tag filter after the header
const header = document.querySelector('.gallery-heading');
if (header) {
  header.insertAdjacentElement('afterend', tagFilterContainer);
}

// Get tag filter elements
const tagFilterTags = tagFilterContainer.querySelector('.tag-filter-tags');
const clearFilterBtn = tagFilterContainer.querySelector('.clear-filter-btn');

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
      <div class="lightbox-tags"></div>
    </div>
  </div>
`;
document.body.appendChild(lightbox);

const lightboxContent = document.getElementById("lightbox-content");
const lightboxMedia = lightboxContent.querySelector(".lightbox-media");
const lightboxCaption = lightboxContent.querySelector(".lightbox-caption");
const lightboxDate = lightboxContent.querySelector(".lightbox-date");
const lightboxTags = lightboxContent.querySelector(".lightbox-tags");
const closeBtn = lightboxContent.querySelector(".close-lightbox");
const deleteBtn = lightboxContent.querySelector(".lightbox-delete-btn");

let currentMemoryId = null;
let currentMemoryData = null;
let allMemories = [];
let allTags = new Set();
let currentFilterTag = null;

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
    
    // Remove from local data
    allMemories = allMemories.filter(memory => memory.id !== memoryId);
    
    // Rebuild tag list
    rebuildTagList();
    
    // Apply current filter if any
    if (currentFilterTag) {
      filterMemoriesByTag(currentFilterTag);
    } else {
      displayMemories(allMemories);
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
function showEmptyState(message = "No Memories Yet") {
  gallery.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-images"></i>
      <h3>${message}</h3>
      <p>${currentFilterTag ? `No memories with tag "${currentFilterTag}"` : 'Upload your first memory to see it here!'}</p>
      ${!currentFilterTag ? '<a href="upload.html" class="btn-upload">Upload Memory</a>' : ''}
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

// Function to display memories
function displayMemories(memories) {
  // Clear gallery
  gallery.innerHTML = "";
  
  if (!memories || memories.length === 0) {
    const message = currentFilterTag ? `No memories with tag "${currentFilterTag}"` : "No Memories Yet";
    showEmptyState(message);
    return;
  }
  
  console.log("Displaying", memories.length, "memories");
  
  memories.forEach(memory => {
    const data = memory.data;
    const memoryCard = document.createElement("div");
    memoryCard.className = "polaroid";
    memoryCard.dataset.id = memory.id;

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
          ${data.tags.map(tag => {
            const isCurrentFilter = currentFilterTag === tag;
            return `<span class="tag ${isCurrentFilter ? 'tag-active' : ''}" data-tag="${tag}">#${tag}</span>`;
          }).join('')}
        </div>
      `;
    }

    // Add delete button to each memory card
    const deleteIconHTML = `
      <button class="delete-memory-btn" data-id="${memory.id}">
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
      
      // Don't open lightbox if tag was clicked (for filtering)
      if (e.target.classList.contains('tag')) {
        e.stopPropagation();
        filterMemoriesByTag(e.target.dataset.tag);
        return;
      }
      
      currentMemoryId = memory.id;
      currentMemoryData = data;
      
      lightbox.classList.add("active");
      deleteBtn.style.display = "block";
      
      // Clear previous content
      lightboxMedia.innerHTML = "";
      lightboxCaption.textContent = "";
      lightboxDate.textContent = "";
      lightboxTags.innerHTML = "";
      
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
      
      // Add tags to lightbox
      if (data.tags && data.tags.length > 0) {
        data.tags.forEach(tag => {
          const tagElement = document.createElement('span');
          tagElement.className = 'tag';
          tagElement.textContent = `#${tag}`;
          tagElement.dataset.tag = tag;
          tagElement.addEventListener('click', (e) => {
            e.stopPropagation();
            lightbox.classList.remove("active");
            filterMemoriesByTag(tag);
          });
          lightboxTags.appendChild(tagElement);
        });
      }
    });

    // Delete button event
    const deleteBtn = memoryCard.querySelector('.delete-memory-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent lightbox from opening
      deleteMemory(memory.id);
    });

    // Add tag click events inside memory card
    memoryCard.querySelectorAll('.tag').forEach(tagElement => {
      tagElement.addEventListener('click', (e) => {
        e.stopPropagation();
        filterMemoriesByTag(e.target.dataset.tag);
      });
    });

    gallery.appendChild(memoryCard);
  });
}

// Function to rebuild tag list from all memories
function rebuildTagList() {
  allTags.clear();
  
  allMemories.forEach(memory => {
    if (memory.data.tags && Array.isArray(memory.data.tags)) {
      memory.data.tags.forEach(tag => {
        if (tag && tag.trim() !== "") {
          allTags.add(tag.trim().toLowerCase());
        }
      });
    }
  });
  
  updateTagFilterDisplay();
}

// Function to update tag filter display
function updateTagFilterDisplay() {
  if (allTags.size === 0) {
    tagFilterTags.innerHTML = '<div class="no-tags">No tags yet. Add tags when uploading memories.</div>';
    return;
  }
  
  // Convert Set to Array and sort alphabetically
  const sortedTags = Array.from(allTags).sort();
  
  tagFilterTags.innerHTML = sortedTags.map(tag => {
    const isActive = currentFilterTag === tag;
    return `<span class="filter-tag ${isActive ? 'filter-tag-active' : ''}" data-tag="${tag}">#${tag}</span>`;
  }).join('');
  
  // Add click events to filter tags
  tagFilterTags.querySelectorAll('.filter-tag').forEach(tagElement => {
    tagElement.addEventListener('click', () => {
      const tag = tagElement.dataset.tag;
      filterMemoriesByTag(tag);
    });
  });
}

// Function to filter memories by tag
function filterMemoriesByTag(tag) {
  if (!tag) {
    // Clear filter
    currentFilterTag = null;
    clearFilterBtn.style.display = 'none';
    displayMemories(allMemories);
    updateTagFilterDisplay();
    return;
  }
  
  currentFilterTag = tag;
  clearFilterBtn.style.display = 'block';
  
  // Filter memories
  const filteredMemories = allMemories.filter(memory => {
    return memory.data.tags && 
           memory.data.tags.some(t => t.toLowerCase() === tag.toLowerCase());
  });
  
  console.log(`Filtering by tag "${tag}": Found ${filteredMemories.length} memories`);
  
  // Update tag filter display to show active tag
  updateTagFilterDisplay();
  
  // Display filtered memories
  displayMemories(filteredMemories);
  
  // Scroll gallery into view
  gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Clear filter function
function clearFilter() {
  currentFilterTag = null;
  clearFilterBtn.style.display = 'none';
  displayMemories(allMemories);
  updateTagFilterDisplay();
}

// Set up clear filter button
clearFilterBtn.addEventListener('click', clearFilter);

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
    
    // Store all memories
    allMemories = [];
    snapshot.forEach(doc => {
      allMemories.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Rebuild tag list
    rebuildTagList();
    
    // Display all memories initially
    displayMemories(allMemories);
    
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

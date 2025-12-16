// viewgallery.js
import { db, auth } from './firebase.js';
import { where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const gallery = document.getElementById("gallery");

// Create lightbox element
const lightbox = document.createElement("div");
lightbox.id = "lightbox";
lightbox.innerHTML = `<div id="lightbox-content"></div>`;
document.body.appendChild(lightbox);

const lightboxContent = document.getElementById("lightbox-content");

lightbox.addEventListener("click", () => {
  lightbox.classList.remove("active");
  lightboxContent.innerHTML = "";
});

async function loadMemories() {
  const user = auth.currentUser;

if (!user) return;

const q = query(
  collection(db, "memories"),
  where("userId", "==", user.uid),
  orderBy("createdAt", "desc")
);

  const snapshot = await getDocs(q);

  snapshot.forEach(doc => {
    const data = doc.data();
    const memoryCard = document.createElement("div");
    memoryCard.className = "polaroid";

    // Format time
    const createdAt = data.createdAt?.toDate?.() || new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const formattedTime = createdAt.toLocaleDateString('en-GB', options);


    let mediaHTML = "";
    if (data.type === "video") {
      mediaHTML = `<video src="${data.url}" muted loop playsinline></video>`;
    } else {
      mediaHTML = `<img src="${data.url}" alt="Memory Photo">`;
    }

    memoryCard.innerHTML = `
      ${mediaHTML}
      <p class="caption">${data.caption}</p>
      <p class="album-time"> ${formattedTime}</p>
    `;

    memoryCard.addEventListener("click", () => {
      lightbox.classList.add("active");
      if (data.type === "video") {
        lightboxContent.innerHTML = `<video src="${data.url}" autoplay controls></video>`;
      } else {
        lightboxContent.innerHTML = `<img src="${data.url}" alt="Memory">`;
      }
    });

    gallery.appendChild(memoryCard);
  });
}

loadMemories();

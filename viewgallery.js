// Optional: Swipe to delete on mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
  if (e.target.closest('.polaroid')) {
    touchStartX = e.changedTouches[0].screenX;
  }
});

document.addEventListener('touchend', e => {
  if (e.target.closest('.polaroid')) {
    touchEndX = e.changedTouches[0].screenX;
    const memoryCard = e.target.closest('.polaroid');
    
    // Swipe left (delete gesture)
    if (touchStartX - touchEndX > 100) {
      const memoryId = memoryCard.dataset.id;
      if (memoryId && confirm("Swipe to delete this memory?")) {
        deleteMemory(memoryId);
      }
    }
  }
});

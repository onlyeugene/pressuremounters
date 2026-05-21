// Contentful Configuration
const SPACE_ID = 'rfov9c1xrame';
const ACCESS_TOKEN = 'tSR9ILdi6a7ZFXlS-_ShSpNFsM__ma3ygFmvisPrI4U';
const CONTENT_TYPE_ID = 'members'; 
const API_URL = `https://preview.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=${CONTENT_TYPE_ID}&order=sys.createdAt`;

// Function to fetch members from Contentful
async function fetchMembers() {
  const container = document.getElementById('members-grid');
  
  // Show a loading message while fetching
  container.innerHTML = `
    <div style="text-align: center; width: 100%; padding: 4rem 1rem; color: #666; grid-column: 1 / -1;">
      <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-radius: 50%; border-top-color: #333; animation: spin 1s ease-in-out infinite; margin-bottom: 1rem;"></div>
      <p style="font-weight: 500; font-size: 1.1rem;">Loading members...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Clear loading message
    container.innerHTML = '';

    // If no members are found
    if (!data.items || data.items.length === 0) {
       container.innerHTML = `
         <div style="text-align: center; width: 100%; padding: 4rem 1rem; background: #f8f9fa; border-radius: 12px; grid-column: 1 / -1;">
           <span style="font-size: 3rem; margin-bottom: 1rem; display: block;">👥</span>
           <h3 style="color: #333; margin-bottom: 0.5rem; font-size: 1.5rem;">No Members Yet</h3>
           <p style="color: #666;">Please add some members in your Contentful dashboard to see them here.</p>
         </div>
       `;
       return;
    }

    // Create a map of assets (images) to easily look them up by ID
    const assets = {};
    if (data.includes && data.includes.Asset) {
      data.includes.Asset.forEach(asset => {
        assets[asset.sys.id] = asset.fields.file.url;
      });
    }

    // Render each member card
    data.items.forEach(item => {
      const member = item.fields;
      
      // Get the image URL if an image exists
      let imageUrl = 'assets/placeholder.jpeg'; // Fallback if no image
      if (member.image && member.image.sys && assets[member.image.sys.id]) {
        imageUrl = 'https:' + assets[member.image.sys.id];
      }

      // Default values to prevent undefined displaying on the page
      const name = member.name || 'Unknown Member';
      const bio = member.bio || '';
      const location = member.location || 'Unknown Location';
      const profession = member.profession || 'Unknown Profession';
      const birthday = member.birthday || 'Unknown Birthday';

      // Create the HTML structure for the card
      const article = document.createElement('article');
      article.className = 'project-card';
      
      article.innerHTML = `
        <div class="image-container">
          <img src="${imageUrl}" alt="${name}" />
        </div>
        <div class="project-info">
          <h3>${name}</h3>
          <p>${bio}</p>
          <div class="project-meta">
            <span>📍 ${location}</span>
            <span>💼 ${profession}</span>
            <span>🎂 ${birthday}</span>
          </div>
        </div>
      `;

      container.appendChild(article);
    });

  } catch (error) {
    console.error('Error fetching members from Contentful:', error);
    container.innerHTML = `
      <div style="text-align: center; width: 100%; padding: 3rem 1rem; background: #fff5f5; border: 1px solid #fc8181; border-radius: 12px; grid-column: 1 / -1; margin-top: 1rem;">
        <svg style="width: 48px; height: 48px; margin: 0 auto 1rem; color: #f56565;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 style="margin-bottom: 0.5rem; color: #c53030; font-size: 1.25rem;">Oops! We couldn't load the members.</h3>
        <p style="color: #c53030; opacity: 0.9;">There was a problem connecting to Contentful. Please double-check your API keys or your internet connection.</p>
      </div>
    `;
  }
}

// Fetch members when the page loads
document.addEventListener('DOMContentLoaded', fetchMembers);

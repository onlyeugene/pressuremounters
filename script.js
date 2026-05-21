// Contentful Configuration
const SPACE_ID = 'rfov9c1xrame';
const ACCESS_TOKEN = 'tSR9ILdi6a7ZFXlS-_ShSpNFsM__ma3ygFmvisPrI4U';
const CONTENT_TYPE_ID = 'members'; 
const API_URL = `https://preview.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=${CONTENT_TYPE_ID}&order=sys.createdAt`;

// Function to fetch members from Contentful
async function fetchMembers() {
  const container = document.getElementById('members-grid');
  
  // Show a loading message while fetching
  container.innerHTML = '<p style="text-align: center; width: 100%;">Loading members...</p>';

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
       container.innerHTML = '<p style="text-align: center; width: 100%;">No members found. Please add members in Contentful.</p>';
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
    container.innerHTML = '<p style="text-align: center; width: 100%; color: red;">Failed to load members. Please check your API keys or internet connection.</p>';
  }
}

// Fetch members when the page loads
document.addEventListener('DOMContentLoaded', fetchMembers);

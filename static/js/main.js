const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const header = document.querySelector('.site-header');

menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  nav?.classList.toggle('open', open);
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-label', 'Open navigation');
}));

const sections = [...document.querySelectorAll('main section[id]')];
const navLinks = [...document.querySelectorAll('.main-nav a')];
if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const active = link.hash === `#${entry.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach((section) => sectionObserver.observe(section));
}

let scrollQueued = false;
function updateScrollUI() {
  const range = document.documentElement.scrollHeight - window.innerHeight;
  const progress = range > 0 ? (window.scrollY / range) * 100 : 0;
  document.querySelector('#scroll-progress')?.style.setProperty('width', `${progress}%`);
  header?.classList.toggle('is-scrolled', window.scrollY > 24);
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  window.requestAnimationFrame(updateScrollUI);
}, { passive: true });
updateScrollUI();

const projectInfo = {
  medstt: {
    title: 'MedSTT Backend',
    lede: 'A backend repository for a medical speech-to-text workflow.',
    details: [
      ['Focus', 'A backend foundation for medical speech-to-text workflows.'],
      ['Purpose', 'Turn spoken input into useful text for a domain where wording and details matter.'],
      ['Repository', 'The implementation is available through the linked MedSTT Backend repository.'],
      ['Technology', 'Speech-to-Text · Backend · Medical AI'],
      ['Next steps', 'Document the deployed API, model selection and evaluation process as the project evolves.']
    ], tags: ['Speech-to-Text', 'Backend', 'Medical AI']
  },
  frame: {
    title: 'Frame Interpolation',
    lede: 'An AI model that generates intermediate frames from two given frames to increase the frame rate in 2D animation.',
    details: [
      ['Problem', 'Generate the visual moments that sit between two input frames.'],
      ['Solution', 'An AI model creates intermediate frames, which can increase the apparent frame rate of 2D animation.'],
      ['Technology', 'Python · Computer Vision · Frame Interpolation'],
      ['Repository', 'The implementation and sample assets are available through the linked GitHub repository.']
    ], tags: ['Computer Vision', 'Python', 'Animation']
  },
  voice: {
    title: 'Speech-to-Text & Text-to-Speech',
    lede: 'A voice interface experiment that works in both directions: speech to text and text back to speech.',
    details: [
      ['Focus', 'Explore the complete loop of a voice-driven interaction.'],
      ['Speech-to-text', 'Transcribe spoken words into text that can be stored, searched or passed to another system.'],
      ['Text-to-speech', 'Return generated text as audible output for a more natural voice experience.'],
      ['Repository', 'The project implementation is available through the linked GitHub repository.']
    ], tags: ['Speech Recognition', 'Text-to-Speech', 'Python']
  }
};

const dialog = document.querySelector('#project-dialog');
const closeDialog = dialog?.querySelector('.dialog-close');
document.querySelectorAll('.details-trigger').forEach((button) => button.addEventListener('click', () => {
  const project = projectInfo[button.dataset.project];
  if (!project || !dialog) return;
  document.querySelector('#dialog-title').textContent = project.title;
  document.querySelector('#dialog-lede').textContent = project.lede;
  document.querySelector('#dialog-details').replaceChildren(...project.details.map(([title, body]) => {
    const article = document.createElement('article');
    article.className = 'detail-item';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const paragraph = document.createElement('p');
    paragraph.textContent = body;
    article.append(heading, paragraph);
    return article;
  }));
  const tags = document.querySelector('#dialog-tags');
  tags.replaceChildren(...project.tags.map((tag) => {
    const item = document.createElement('span');
    item.textContent = tag;
    return item;
  }));
  dialog.showModal();
}));
closeDialog?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.hover-glow').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });
}

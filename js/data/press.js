/**
 * Press & Exhibitions data for Odiville.
 *
 * Press entry fields:
 *   id          – unique slug
 *   pub         – publication name
 *   title       – article/feature title
 *   date        – display date string (e.g. "March 2025")
 *   url         – external link (or null)
 *   description – optional short excerpt or summary
 *
 * Exhibition entry fields:
 *   id          – unique slug
 *   venue       – venue / gallery name
 *   title       – exhibition/show title
 *   location    – city, country
 *   date        – display date string
 *   url         – external link (or null)
 *   description – optional note
 */

window.PRESS_ENTRIES = [
  /* Example — uncomment to activate:
  {
    id: 'example-press',
    pub: 'Publication Name',
    title: 'Article or Feature Title',
    date: 'January 2025',
    url: 'https://example.com',
    description: 'Brief description of the coverage.'
  }
  */
];

window.EXHIBITION_ENTRIES = [
  /* Example — uncomment to activate:
  {
    id: 'example-exhibition',
    venue: 'Gallery or Venue Name',
    title: 'Exhibition Title',
    location: 'New York, USA',
    date: '2025',
    url: null,
    description: 'Brief description of the exhibition.'
  }
  */
];

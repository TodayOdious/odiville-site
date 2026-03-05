(function() {
  const RESIDENTS = {
    'the-end': {
      name: 'The End',
      chapter: 'Chapter 1',
      pair: 'the arrival',
      img: 'images/Whispers/Residents/The End.gif',
      pairImg: 'images/Whispers/Whispers_Art/the_arrival.gif',
      desc: 'This Resident reflects a moment of choice. A book built on choice could only begin here. The choice in this case, is perception. Though this is the start of our journey, the Resident wears the name of its opposite. Leaving us to question where we stand at this very moment.'
    },
    'neverwas': {
      name: 'Neverwas',
      chapter: 'Chapter 6',
      pair: 'a choice in the clouds',
      img: 'images/Whispers/Residents/Neverwas.gif',
      pairImg: 'images/Whispers/Whispers_Art/a_choice_in_the_clouds.png',
      desc: 'Three paths were presented. Altering the reality before them, though only one could be chosen. This Resident wears the moment, carrying the torch of what could have been, what is, and what never was.'
    },
    'one-lie': {
      name: 'One Lie',
      chapter: 'Chapter 7A',
      pair: 'you\u2019re wrong about them',
      img: 'images/Whispers/Residents/One Lie.gif',
      pairImg: 'images/Whispers/Whispers_Art/you_re_wrong_about_them.gif',
      desc: 'The heartbeat of this Resident lies in our original choice. The door we chose but were forced to watch with regret as we entered the antithesis of our opening room. A moment that highlights how we are often drawn to comfort, rather than leaping into a casket of unwanted mirrors.'
    },
    'one-truth': {
      name: 'One Truth',
      chapter: 'Chapter 7',
      pair: 'antithesis',
      img: 'images/Whispers/Residents/One Truth.gif',
      pairImg: 'images/Whispers/Whispers_Art/antithesis.png',
      desc: 'For every lie, there must be a truth, and within every truth, there lies a lie. This Resident is charged with our true answer, but it had to lie to us first in order for us to confront what we truly see. If the doors hadn\u2019t been swapped, we would have walked in without fear, without challenge. The exact lie that often holds us back from a truth we are so afraid to meet.'
    },
    'inbetween': {
      name: 'Inbetween',
      chapter: 'Chapter 9',
      pair: 'farewell to odiville',
      img: 'images/Whispers/Residents/Inbetween.gif',
      pairImg: 'images/Whispers/Whispers_Art/farewell_to_odiville.gif',
      desc: 'A thin moment of indecision, suspended between two thoughts. This Resident captures the two endings of our story in a perfect yet serene event of near collapse. Both choices harvest reasons for contemplation. And so they choose to remain seated within the moment, forever beaming thoughts into an impossible reality. The same moment, on repeat, for eternity.'
    },
    'ferryman': {
      name: 'Ferryman',
      chapter: 'Chapter 3',
      pair: 'blue reverie',
      img: 'images/Whispers/Residents/Ferryman_resized.gif',
      pairImg: 'images/Whispers/Whispers_Art/blue_reverie.png',
      desc: 'The Ferryman sails, and sails, and sails, transporting fallen souls across the blue. They are the only Resident that roam here. It is a quiet place, one that demands a lifetime of patience, which is why this particular figure takes on the form of the reaper. Throughout our trials we will face many moments, but unbeknownst to us, this is among the most frightening, disguised as an innocent intermission as we cross the waters.'
    }
  };

  const overlay = document.getElementById('residentModal');
  const closeBtn = document.getElementById('residentModalClose');
  const rmImg = document.getElementById('rmImg');
  const rmPairImg = document.getElementById('rmPairImg');
  const rmPairLabel = document.getElementById('rmPairLabel');
  const rmName = document.getElementById('rmName');
  const rmChapter = document.getElementById('rmChapter');
  const rmDesc = document.getElementById('rmDesc');

  function openModal(key) {
    const r = RESIDENTS[key];
    if (!r) return;
    rmImg.src = r.img;
    rmImg.alt = r.name;
    rmPairImg.src = r.pairImg;
    rmPairImg.alt = r.pair;
    rmPairLabel.textContent = 'Paired \u2014 ' + r.pair;
    rmName.textContent = r.name;
    rmChapter.textContent = r.chapter + ' \u00B7 Residents of Odiville';
    rmDesc.textContent = r.desc;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.resident-card[data-resident]').forEach(function(card) {
    card.addEventListener('click', function() {
      openModal(this.dataset.resident);
    });
  });

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });
})();

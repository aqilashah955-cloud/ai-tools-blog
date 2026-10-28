/* AI Tools Blog — form storage on Firestore (project: ai-tools-blog).
 *
 * Loaded after the Firebase compat SDKs (see the <script> tags in each
 * page). Newsletter signups go to the "subscribers" collection and contact
 * messages to "messages". Writes are create-only; reads/updates/deletes
 * are denied by the Firestore rules (see README), so visitor data cannot
 * be listed or changed from the browser.
 *
 * If the SDKs fail to load (offline / blocked CDN), forms fall back to the
 * old honest behaviour instead of breaking: the newsletter form says the
 * signup was not saved, and the contact form opens the visitor's email
 * app as before. */

'use strict';

(function () {
  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyC1B5REvTU4w_mUhUF12JQiNk3kjW9C8ZA',
    authDomain: 'ai-tools-blog.firebaseapp.com',
    projectId: 'ai-tools-blog',
    storageBucket: 'ai-tools-blog.firebasestorage.app',
    messagingSenderId: '558968624216',
    appId: '1:558968624216:web:817552298ab6506ab1a62d'
  };

  function setStatus(form, text) {
    var status = form.querySelector('.form-status');
    if (status) {
      status.hidden = false;
      status.textContent = text;
    }
  }

  function setBusy(form, busy) {
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = busy;
  }

  function fallbackForms() {
    document.querySelectorAll('form.newsletter').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        setStatus(form, 'Thanks for signing up! Newsletter delivery is not connected yet, so your address was not saved.');
        form.reset();
      });
    });
    var contact = document.querySelector('form.contact-form');
    if (contact) {
      contact.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = contact.querySelector('#contact-name').value.trim();
        var email = contact.querySelector('#contact-email').value.trim();
        var message = contact.querySelector('#contact-message').value.trim();
        var subject = encodeURIComponent('Blog contact from ' + (name || 'a reader'));
        var body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message);
        window.location.href = 'mailto:aqilashah955@gmail.com?subject=' + subject + '&body=' + body;
        setStatus(contact, 'Your email app should now open with the message ready to send.');
      });
    }
  }

  function liveForms(db) {
    var timestamp = firebase.firestore.FieldValue.serverTimestamp;

    document.querySelectorAll('form.newsletter').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="email"]');
        var email = input ? input.value.trim() : '';
        if (!email) return;
        setBusy(form, true);
        db.collection('subscribers').add({ email: email, createdAt: timestamp() }).then(function () {
          setStatus(form, 'Thanks for subscribing! Your address is saved — you will hear when a new tutorial is published.');
          form.reset();
          setBusy(form, false);
        }, function () {
          setStatus(form, 'Sorry, the signup could not be saved. Please try again in a moment.');
          setBusy(form, false);
        });
      });
    });

    var contact = document.querySelector('form.contact-form');
    if (contact) {
      contact.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = contact.querySelector('#contact-name').value.trim();
        var email = contact.querySelector('#contact-email').value.trim();
        var message = contact.querySelector('#contact-message').value.trim();
        if (!name || !email || !message) return;
        setBusy(contact, true);
        db.collection('messages').add({
          name: name,
          email: email,
          message: message,
          createdAt: timestamp()
        }).then(function () {
          setStatus(contact, 'Thanks! Your message is saved and will be read.');
          contact.reset();
          setBusy(contact, false);
        }, function () {
          setStatus(contact, 'Sorry, the message could not be saved. Please try again in a moment.');
          setBusy(contact, false);
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (window.firebase && firebase.firestore) {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        liveForms(firebase.firestore());
        return;
      }
    } catch (err) {
      /* fall through to the fallback forms below */
    }
    fallbackForms();
  });
})();

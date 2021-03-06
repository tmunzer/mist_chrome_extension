chrome.runtime.onMessage.addListener((request, sender, respond) => {
  const handler = new Promise((resolve, reject) => {
    if (request) {
      resolve(window.location.href);
    } else {
      reject('');
    }
  });

  handler
    .then(message => {
      console.log(message)
      respond(message)
    })
    .catch(error => respond(error));
  return true;
});

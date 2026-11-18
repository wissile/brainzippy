// BrainZippy public pages: the only script on content pages (kept tiny on purpose).
// Returning players skip the first-run story: Play goes to Monster Island instead of /hello.
(function () {
  try {
    var s = JSON.parse(localStorage.getItem("bz.v1") || "null");
    if (s && s.profile && s.profile.step === "done") {
      var links = document.querySelectorAll("a[data-play]");
      for (var i = 0; i < links.length; i++) links[i].setAttribute("href", "/map");
    }
  } catch (e) {
    /* storage unavailable: keep /hello */
  }
})();

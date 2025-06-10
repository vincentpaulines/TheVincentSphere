function syncEditors(form) {
  const editors = form.querySelectorAll('.editor');
  let valid = true;
  editors.forEach(editor => {
    const name = editor.dataset.name;
    const input = form.querySelector(`input[name="${name}"]`);
    const text = editor.innerHTML.trim();
    if (text === '') {
      valid = false;
    }
    if (input) input.value = text;
  });
  if (!valid) {
    return false;
  }
  return true;
}

function youtube_parser(yturl) {
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = yturl.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
}

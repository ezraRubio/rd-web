// Dup to the function in hbb_common, lib.rs
export function getVersionNumber(v) {
  try {
    let versions = v.split("-");

    let n = 0;

    if (versions.length > 0) {
      let last = 0;
      for (let x of versions[0].split(".")) {
        last = parseInt(x) || 0;
        n = n * 1000 + last;
      }
      n -= last;
      n += last * 10;
    }

    if (versions.length > 1) {
      n += parseInt(versions[1]) || 0;
    }

    return n;
  } catch (e) {
    console.error('Failed to parse version number: "' + v + '" ' + e.message);
    return 0;
  }
}

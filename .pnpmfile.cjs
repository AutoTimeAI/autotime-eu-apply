/**
 * AutoTime has no Less source files. Vite/WXT advertise Less as an optional
 * peer, but resolving it adds the unpatched image-size parser to the lockfile.
 * Remove only that optional peer during dependency resolution; CSS, PostCSS,
 * Sass and the supported extension build remain unchanged and are verified by
 * the frozen build gates.
 */
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.peerDependenciesMeta?.less?.optional) {
        delete pkg.peerDependencies.less;
        delete pkg.peerDependenciesMeta.less;
      }
      return pkg;
    },
  },
};

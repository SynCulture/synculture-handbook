// An entry without `published: true` is not written out at all. Unfinished
// stubs would otherwise sit at a guessable URL as blank pages, reachable by
// anyone with the link and by a crawler, while being absent from the index.
module.exports = {
  layout: "handbook-entry.njk",
  tags: "handbookEntry",
  eleventyComputed: {
    permalink: (data) => (data.published ? data.permalink : false),
  },
};

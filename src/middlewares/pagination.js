const pagination = (req, res, next) => {
  // Receiving how much users with be listed in our pagination
  let pageAsNumber = Number.parseInt(req.query.page);
  let sizeAsNumber = Number.parseInt(req.query.size);

  let size = Number.isNaN(sizeAsNumber) ? 10 : sizeAsNumber;
  if (size > 10 || size < 1) {
    size = 10;
  }
  //Receiving the page param and convert it to integer or assign to 0
  let page = Number.isNaN(pageAsNumber) ? 0 : pageAsNumber;

  if (page < 0) {
    page = 0;
  }

  req.pagination = { page, size };
  next();
};

module.exports = { pagination };

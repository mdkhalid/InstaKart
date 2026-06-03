import React from "react";

const MockImage = (props: any) => {
  const { fill, width, height, className, alt, src, ...rest } = props;
  return React.createElement("img", {
    src,
    alt,
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    className,
    "data-testid": "avatar-image",
    ...rest,
  });
};

MockImage.displayName = "MockImage";

export default MockImage;

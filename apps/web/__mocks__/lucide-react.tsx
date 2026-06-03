import React from "react";

const iconDefaults = {
  width: 24,
  height: 24,
  stroke: "currentColor",
  fill: "none",
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
};

function createIconMock(displayName: string) {
  const Icon = (props: any) =>
    React.createElement("svg", {
      ...iconDefaults,
      ...props,
      "data-testid": `icon-${displayName.toLowerCase()}`,
    });
  Icon.displayName = displayName;
  return Icon;
}

export const Camera = createIconMock("Camera");
export const User = createIconMock("User");

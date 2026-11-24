import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Link } from "@tanstack/react-router";

import type { NavTarget } from "@/lib/formkanwil/navigation";

type AnchorProps = Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "target"> & {
  nav: NavTarget;
  children?: React.ReactNode;
};

/** Typed router link for a schema-driven navigation target. */
export const NavAnchor = forwardRef<HTMLAnchorElement, AnchorProps>(function NavAnchor(
  { nav: target, ...rest },
  ref,
) {
  if ("params" in target) {
    return <Link ref={ref} to={target.to} params={target.params} {...rest} />;
  }
  return <Link ref={ref} to={target.to} {...rest} />;
});

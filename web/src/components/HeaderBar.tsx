import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from "@carbon/react";
import { Information, Catalog, Home } from "@carbon/icons-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function HeaderBar() {
  const nav = useNavigate();
  const loc = useLocation();

  const go = (path: string) => () => nav(path);

  const isActive = (path: string) => (loc.pathname === path ? "page" : undefined);

  return (
    <Header aria-label="The Signal Reader">
      <HeaderName prefix="" href={import.meta.env.BASE_URL} onClick={(e) => { e.preventDefault(); nav("/"); }}>
        The Signal Reader
      </HeaderName>

      <HeaderNavigation aria-label="Primary navigation">
        <HeaderMenuItem aria-current={isActive("/")} onClick={go("/")}>
          Digest
        </HeaderMenuItem>
        <HeaderMenuItem aria-current={isActive("/sources")} onClick={go("/sources")}>
          Sources
        </HeaderMenuItem>
        <HeaderMenuItem aria-current={isActive("/about")} onClick={go("/about")}>
          About
        </HeaderMenuItem>
      </HeaderNavigation>

      <HeaderGlobalBar>
        <HeaderGlobalAction aria-label="Digest" onClick={go("/")}>
          <Home size={20} />
        </HeaderGlobalAction>
        <HeaderGlobalAction aria-label="Sources" onClick={go("/sources")}>
          <Catalog size={20} />
        </HeaderGlobalAction>
        <HeaderGlobalAction aria-label="About" onClick={go("/about")}>
          <Information size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
}

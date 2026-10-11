import { PageLoader } from "./ui/BrandLoader";



export default function RouteFallback({

  label = "Loading module…",

}) {

  return <PageLoader label={label} />;

}


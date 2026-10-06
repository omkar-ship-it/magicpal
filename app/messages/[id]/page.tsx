import HashRedirect from "@/components/HashRedirect";

/** A thread opens as a floating page on the map now, not on its own route. */
export default function MessageRedirect() {
  return <HashRedirect to="/#/chats" />;
}

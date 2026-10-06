import HashRedirect from "@/components/HashRedirect";

/** Was a page of its own; your connections are in the dock's Chats block now. */
export default function ConnectionsRedirect() {
  return <HashRedirect to="/#/chats" />;
}

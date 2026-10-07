import OpenLoader from "@/components/OpenLoader";

/**
 * The open network — the same engine as /circle with the walls taken down,
 * so the two can be tested against each other.
 *
 * Nobody is invited and nobody is vouched for, which changes three things:
 * everyone shares one map instead of a community, a first message has to be
 * asked for, and relevance is computed (a shared city, a shared community, a
 * thing they offered to help with) rather than given by membership.
 */
export default function OpenPage() {
  return <OpenLoader />;
}

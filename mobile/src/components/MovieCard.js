import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getPosterUrl } from "../lib/tmdb";

function MovieCard({ item, onPress }) {
  const title = item.title || item.name || "Untitled";
  const poster = getPosterUrl(item.poster_path);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={styles.placeholderText}>No Poster</Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.media_type === "tv" ? "TV" : "Movie"} • {item.vote_average?.toFixed?.(1) || "N/A"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    marginRight: 12,
  },
  poster: {
    width: 150,
    height: 220,
    borderRadius: 10,
    backgroundColor: "#141414",
  },
  posterPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  meta: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
});

export default MovieCard;

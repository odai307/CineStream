import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MovieCard from "../components/MovieCard";
import { searchMulti } from "../lib/tmdb";

function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchMulti(q);
        setResults(data);
      } catch (err) {
        setError(err.message || "Search failed");
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const openWatch = (item) => {
    navigation.navigate("Watch", {
      id: item.id,
      mediaType: item.media_type || "movie",
      title: item.title || item.name,
    });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Search</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search movies, series, anime..."
        placeholderTextColor="#6b7280"
        style={styles.input}
      />

      {loading && <Text style={styles.secondary}>Searching...</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && !error && query.trim() && results.length === 0 && (
        <Text style={styles.secondary}>No results found.</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.media_type}-${item.id}-${index}`}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.column}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={() => openWatch(item)} />
        )}
      />

      <Pressable
        style={styles.openHomeButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.openHomeText}>Back to Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#141414",
    borderColor: "#374151",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    marginBottom: 12,
  },
  list: {
    paddingBottom: 90,
  },
  column: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  secondary: {
    color: "#9ca3af",
    marginBottom: 12,
  },
  error: {
    color: "#f87171",
    marginBottom: 12,
  },
  openHomeButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#dc2626",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  openHomeText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default SearchScreen;

package utils

import "math/rand/v2"

var (
	ADJECTIVES = []string{
		"Happy", "Sad", "Brave", "Shy", "Clever", "Kind", "Funny", "Serious",
		"Curious", "Friendly", "Honest", "Generous", "Patient", "Creative", "Calm",
		"Energetic", "Silly", "Wise", "Grateful", "Ambitious", "Charming",
		"Determined", "Loyal", "Optimistic", "Polite", "Reliable", "Sincere", "Thoughtful",
		"Vibrant", "Witty",
	}
	NOUNS = []string{
		"Dog", "Cat", "Elephant", "Pangolin", "Tiger", "Giraffe", "Monkey", "Zebra", "Panda",
		"Kangaroo", "Koala", "Hippo", "Rhino", "Crocodile", "Snake", "Turtle", "Dolphin",
		"Whale", "Shark", "Octopus", "Penguin", "Ostrich", "Eagle", "Parrot", "Butterfly",
		"Bee", "Ant", "Capybara", "Frog", "Fish",
	}
)

func GenerateRandomDisplayName() string {
	return ADJECTIVES[rand.UintN(30)] + NOUNS[rand.UintN(30)]
}
